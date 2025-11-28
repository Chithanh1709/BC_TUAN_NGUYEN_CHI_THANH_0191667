package com.example.ogani.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Sort.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.util.Streamable;
import org.springframework.stereotype.Repository;

import com.example.ogani.models.Product;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {

    @Query(value = "SELECT * FROM product ORDER BY id DESC LIMIT 12", nativeQuery = true)
    List<Product> getListNewest(int number);

    @Query(value = "Select * from Product where category_id = :id order by rand() limit 4", nativeQuery = true)
    List<Product> findRelatedProduct(long id);

    @Query(value = "Select * from Product where category_id = :id", nativeQuery = true)
    List<Product> getListProductByCategory(long id);

    @Query(value = "Select * from Product where category_id = :id and price between :min and :max", nativeQuery = true)
    List<Product> getListProductByPriceRange(long id, int min, int max);

    @Query(value = "Select p from Product p where p.name like %:keyword% order by id desc")
    List<Product> searchProduct(String keyword);

    @Query(value = "Select * from Product order by price limit 8 ",nativeQuery = true)
    List<Product> getListByPrice();

    Product findQuantityById(long productId);

    List<Product> findByName(String productName);

     /**
     * ✅ Lấy tất cả sản phẩm với images (EAGER FETCH)
     */
    @Query("SELECT DISTINCT p FROM Product p LEFT JOIN FETCH p.images")
    List<Product> findAllWithImages();
    
    /**
     * ✅ Lấy sản phẩm theo ID với images
     */
    @Query("SELECT DISTINCT p FROM Product p LEFT JOIN FETCH p.images WHERE p.id = :id")
    Optional<Product> findByIdWithImages(@Param("id") Long id);
    
    /**
     * ✅ Lấy sản phẩm theo category với images
     */
    @Query("SELECT DISTINCT p FROM Product p LEFT JOIN FETCH p.images WHERE p.category.id = :categoryId")
    List<Product> findByCategoryIdWithImages(@Param("categoryId") Long categoryId);

}
